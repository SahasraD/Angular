import { Component, ViewChild, TemplateRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { TableDataService } from './tabledata.service';
import { CookieService } from 'ngx-cookie-service';
import { Ng2SmartTableModule, LocalDataSource } from 'ng2-smart-table';
import { TaskActionComponent } from './task-action/task-action.component';
import { UIConstants } from './ui.constants';
import { ErrorService } from './error/error.service';
import { Utils } from './util/dashboard-utils';

@Component( {
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    providers: [TableDataService, CookieService, ErrorService]
} )
export class AppComponent {
    
    accordionDetails;
    accordionLayout;
    accordionData = new LocalDataSource(); 
    tableData;
    currentRoute: string;
    errorMessage: any;
    title: string;
    isError: boolean;
    headerSummary: any[] = [];
    columnWidth="100";
    showSpinner: boolean = false;
    
    constructor(
        private tableDataService: TableDataService,
        private router: Router, private errorService: ErrorService ) {
        router.events.subscribe( event => {
            if ( event instanceof NavigationEnd ) {
                this.currentRoute = event.url;
            }
        } );
    }
    
    /**
     * Load myWork accordion data
     */
    ngOnInit() {
        this.loadMyWorkAccordion();
    }
    
    
    /**
     * load My Work.
     */
    loadMyWorkAccordion () {
        this.tableDataService.getTableData( UIConstants.MY_WORK )
            .subscribe(
            data => {
                this.tableData = data.accordion.accordionData;
                
                let screenConfig = data.workflowScreenConfig;
                if ( screenConfig != null && screenConfig.data != null ) {
                    let screenConfigAsJson = JSON.parse( screenConfig.data );
                    this.title = screenConfigAsJson.title;
                    if ( this.title == null || this.title.trim() == '' ) {
                        this.title = UIConstants.title;
                    }

                    this.accordionDetails = screenConfigAsJson.sections;
                    this.accordionDetails.forEach(( accordion, index ) => {
                        if ( index == 0 ) {
                            this.accordionLayout = accordion.scrnLayout;
                            
                            //Assign actions
                            this.assignActions();
                            
                            //To sort numeric columns
                            Utils.fnConvertStringToJsFuntion( this.accordionLayout.columns )
                            
                            this.accordionData.load( this.tableData[accordion.sectionType].tableDataList );
                            this.loadHeaderData( this.tableData[accordion.sectionType].headerSummary );
                        }
                    } );
                }
            }, error => this.handleError( error ) );

        TaskActionComponent.statusAlert.subscribe( alert => {
            this.errorMessage = null;
            this.isError = false;
            if ( alert.isSuccess ) {
                this.refresh( true );
            } else {
                this.isError = true;
                this.errorMessage = alert.message;
            }
        } );
    }
    
    
    /**
     * Assign actions for each accordion table row
     */
    private assignActions():void {
        let actions = this.accordionLayout.columns.actions;
        if (actions != null) {
            actions = Object.assign(actions, {"renderComponent": TaskActionComponent});
            this.accordionLayout.columns = Object.assign(this.accordionLayout.columns, {'actions': actions});
          }
    }

    /**
     * Load accordian data onOpen event.
     * @param index accordion index
     */
     loadAccordionData( index: number ) {
         
        this.showSpinner = true;
        let accordion = this.accordionDetails[index];
        this.accordionLayout = accordion.scrnLayout;
        
        //Assign actions and sort numeric columns
        this.assignActions();
        Utils.fnConvertStringToJsFuntion(this.accordionLayout.columns)
        
        //My work or Team work accordion data
        if ( accordion.sectionType != UIConstants.tasksByGroupSectionType ) {
            this.tableDataService.getTableData( accordion.title )
            .subscribe(
            data => {
                let accordionTableData = data.accordion.accordionData;
                this.accordionData.load( accordionTableData[accordion.sectionType].tableDataList );
                this.loadHeaderData(accordionTableData[accordion.sectionType].headerSummary);
            }, error => this.handleError( error ) );
        }
        
        //Any other accordion data
        else {
            this.tableDataService.getTasksByGroup( accordion.title )
                .subscribe(
                data => {
                    let accordionTableData = data.accordion.accordionData;
                    this.accordionData.load( accordionTableData[accordion.sectionType].tableDataList );
                    this.loadHeaderData(accordionTableData[accordion.sectionType].headerSummary);
                }, error => this.handleError( error ) );
            }
        }
     
     
     /**
      * hideSpinner.
      */
     hideSpinner() {
       this.showSpinner = false;
     }
     

     /**
      * loadHeaderData for opened accordion.
      * @param headerData
      */
     private loadHeaderData( headerData ) {
         this.hideSpinner();
         if ( headerData ) {
             this.headerSummary = [];
             for ( const columnName of Object.keys( headerData ) ) {
                 let column = {
                     name: "", value: ""
                 };
                 column.name = columnName;
                 column.value = headerData[columnName];
                 this.headerSummary.push( column );
             }
         }
     }
     
     /**
      * handleError.
      * @param error
      */
    private handleError( error ) {
        this.hideSpinner();
        this.errorService.setCurrentError( error );
        const link = ['error'];
        this.router.navigate( link );
    }


    /**
     * refresh data.
     */
    refresh(isSuccess:boolean): void {
       if (isSuccess) {
           this.loadMyWorkAccordion();
       }  
    }
    
}